# typed-patch

Type-aware patch utility.

*holds head in hands* yes, yet another node object diff/patch utility.

This one is aware of object types and potential polymorphism in the patch. That is to say, that the object tree that results from applying a patch may contain objects of different classes to those which were in the patch object or indeed to those in the original patched object.

Basically when merging properties between the patched object and the patch, the resulting property can either be a straight object (in which case, no problem) or an instance of a class. To create an instance of the class, the patch algorithm looks for a static method .fromObject amongst the base classes of the property in the patched object.






