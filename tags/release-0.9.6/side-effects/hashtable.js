/**
 * A true hashtable implemented in Javascript.
 * Based on the Java implementation.
 *
 * By Andrew L. Hayden
 * Website: http://www.andrewlynchhayden.com
 *
 * This library is distributed under the terms of the Apache License 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html
 *
 * Your are free to copy and use this library; I would appreciate it if
 * you kept this attribution message, but you are not required to do so.
 */

// Version information:
// Source: $HeadURL$
// Id: $Id$

function createHashtable()
{
    // Start with a reasonably-sized index.
    return createHashtable(256, .75);
}

function createHashtable(initialCapacity, loadFactor)
{
    var hashtable = new Object;
    hashtable.indexSize = initialCapacity; // MUST be a power of 2!
    hashtable.resizeThreshold = loadFactor * hashtable.indexSize;
    hashtable.loadFactor = loadFactor;
    hashtable.bins = new Array(hashtable.indexSize);
    hashtable.size = 0; // num entries
    return hashtable;
}

function hashInternals_hash(key)
{
    // Computer hash for string, if it doesn't already exist...
    if(!key.hashInternals_key)
    {
        // Pick a prime number... lets use 17.
        var hash = 0;
        var stringKey = key.toString();
        var stringSize = stringKey.length;
        for (var charIndex = 0; charIndex < stringSize; charIndex++)
        {
            hash = (hash * 17) + (stringKey.charAt(charIndex) * 1);
        }
        key.hashInternals_key = hash;
    }
    return key.hashInternals_key
}

function hashInternals_binFor(hashtable, hash)
{
    // As long as indexSize is a power of two,
    // we can obtain an appropriate bin by just binary-ANDing
    // the hashCode against (indexSize-1), since (indexSize-1)
    // will be a single series of 0's followed by a single series of 1's.
    // This is the same way that Java does it, using the same assumptions.
    return hash & (hashtable.indexSize - 1);
}

function hashInternals_getAll(hashtable)
{
    var result = new Array(hashtable.size);
    var binContents;
    var totalCount = 0;
    for (var binIndex = 0; binIndex < hashtable.indexSize; binIndex++)
    {
        if (hashtable.bins[binIndex])
        {
            binContents = hashtable.bins[binIndex];
            for (var listIndex = 0; listIndex < binContents.length; listIndex++)
            {
                // Each entry contains a (key, value) pair.
                result[totalCount++] = binContents[listIndex];
            }
        }
    }
    return result;
}

function hashInternals_containsKey(hashtable, key)
{
    return (undefined != hashInternals_get(hashtable, key));
}

function hashInternals_get(hashtable, key)
{
    var whichBin = hashInternals_binFor(hashtable, hashInternals_hash(key));
    if (hashtable.bins[whichBin])
    {
        var binContents = hashtable.bins[whichBin];
        for (var index=0; index<binContents.length; index++)
        {
            if (binContents[index].key == key)
            {
                return binContents[index].value;
            }
        }
    }
    return undefined;
}

function hashInternals_put(hashtable, key, value)
{
    var whichBin = hashInternals_binFor(hashtable, hashInternals_hash(key));
    var binContents;
    if (!(hashtable.bins[whichBin]))
    {
        binContents = new Array(0);
        hashtable.bins[whichBin] = binContents;
    }
    else
    {
        binContents = hashtable.bins[whichBin];
    }

    var wrapperObject = new Object;
    wrapperObject.key = key;
    wrapperObject.value = value;

    // Search for and replace duplicate entry, if it exists.
    for (var index=0; index<binContents.length; index++)
    {
        if (binContents[index].key == key)
        {
            binContents[index] = wrapperObject;
            return; // return immediately, don't increment size.
        }
    }

    // If we get this far its a new entry entirely.
    binContents.push(wrapperObject);

    // Check size stuff...
    hashtable.size++;
    if (hashtable.size > hashtable.resizeThreshold)
    {
        hashInternals_increaseCapacity(hashtable);
    }
}

function hashInternals_increaseCapacity(hashtable)
{
    var oldContents = hashInternals_getAll(hashtable);
    hashtable.indexSize *= 2;
    hashtable.resizeThreshold = hashtable.indexSize * hashtable.loadFactor;
    hashtable.bins = new Array(hashtable.indexSize);
    hashtable.size = 0; // reset num entries - about to repopulate

    var temp;
    for (var index=0; index < oldContents.length; index++)
    {
        // TODO: this is wasteful in that we allocate a new
        // wrapper object.  Fortunately, the key and value
        // are not duplicated; still, this could be more
        // efficient.
        temp = oldContents[index];
        hashInternals_put(hashtable, temp.key, temp.value);
    }
}

function hashInternals_clear(hashtable)
{
    hashtable.bins = new Array(hashtable.indexSize);
    hashtable.size = 0;
}

function hashInternals_size(hashtable)
{
    return hashtable.size;
}